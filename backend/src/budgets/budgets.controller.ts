import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { AuthUser } from "../common/types/auth-user";
import { BudgetsService } from "./budgets.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { ListBudgetsQueryDto } from "./dto/list-budgets-query.dto";
import { RejectBudgetDto, StatusActionDto } from "./dto/status-action.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";

@ApiTags("Budget Planning")
@ApiBearerAuth()
@Controller("budgets")
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get()
  @RequirePermissions("budgets.read")
  list(@CurrentUser() user: AuthUser, @Query() query: ListBudgetsQueryDto) {
    return this.budgets.list(user, query);
  }

  @Get(":id")
  @RequirePermissions("budgets.read")
  get(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.budgets.get(user, id);
  }

  @Post()
  @RequirePermissions("budgets.create")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBudgetDto) {
    return this.budgets.create(user, dto);
  }

  @Patch(":id")
  @RequirePermissions("budgets.update")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgets.update(user, id, dto);
  }

  @Post(":id/submit")
  @RequirePermissions("budgets.submit")
  submit(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: StatusActionDto,
  ) {
    return this.budgets.submit(user, id, dto.reason);
  }

  @Post(":id/approve")
  @RequirePermissions("budgets.approve")
  approve(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: StatusActionDto,
  ) {
    return this.budgets.approve(user, id, dto.reason);
  }

  @Post(":id/reject")
  @RequirePermissions("budgets.reject")
  reject(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectBudgetDto,
  ) {
    return this.budgets.reject(user, id, dto.reason);
  }

  @Post(":id/close")
  @RequirePermissions("budgets.close")
  close(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: StatusActionDto,
  ) {
    return this.budgets.close(user, id, dto.reason);
  }
}
